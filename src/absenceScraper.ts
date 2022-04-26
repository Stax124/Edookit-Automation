import puppeteer from "puppeteer";
import request_client from "request-promise-native";
import { Logger } from "tslog";
import { PoshSync } from "./classes";
import {
	AbsenceData,
	CookieInterface,
	RequestDataInterface,
} from "./interfaces";
import { sleep } from "./utils";

export class AbsenceScraper {
	log: Logger;
	page: puppeteer.Page;
	cookies: CookieInterface = {
		lastReqTime: "",
		PHPSESSID: "",
		EDOOKIT_ENV: "PROD",
		X$LoginId$System: "",
		__rst: "",
	};
	requestData: RequestDataInterface = {
		__oid: "",
		__tid: "",
		__vmid: "",
		__sid: "",
		__componentId: "",
	};
	absenceData = new Array<AbsenceData>();
	poshSync: PoshSync;

	constructor(logger: Logger, page: puppeteer.Page) {
		this.log = logger;
		this.page = page;
		this.log.info("Scraper initialized");
		this.poshSync = new PoshSync(this.cookies, this.requestData);
	}

	async currentUrl() {
		return this.page.url();
	}

	async getCookies() {
		const returnedCookies = await this.page.cookies();

		this.cookies.PHPSESSID =
			returnedCookies.find((c) => c.name === "PHPSESSID")?.value ?? "";
		this.cookies.X$LoginId$System =
			returnedCookies.find((c) => c.name === "X-LoginId-System")?.value ?? "";
		this.cookies.__rst =
			returnedCookies.find((c) => c.name === "__rst")?.value ?? "";
		this.cookies.lastReqTime =
			returnedCookies.find((c) => c.name === "lastReqTime")?.value ?? "";
	}

	async initPage() {
		this.page.setRequestInterception(true);
		this.page.on("request", (request) => {
			request_client({
				uri: request.url(),
				resolveWithFullResponse: true,
			})
				.then((response) => {
					const request_url = request.url();

					if (!request_url.includes("/handler/grid/")) {
						request.continue();
						return;
					}

					const request_post_data = request.postData();

					const tidPattern = /__tid=([\d]+)/;
					const oidPattern = /__oid=([\d]+)/;
					const vmidPattern = /__vmid=([\w]+)/;
					const sidPattern = /__sid=([\w]+)/;
					const componentIdPattern = /__componentId=([\d]+)/;

					if (request_post_data) {
						this.log.info(
							"Request data found: " + tidPattern.exec(request_post_data)
						);
					} else {
						this.log.warn("No request data found");
					}

					if (request_post_data && tidPattern.test(request_post_data)) {
						this.log.info("TID found");
						this.requestData.__tid = tidPattern.exec(request_post_data)![1];
					}
					if (request_post_data && oidPattern.test(request_post_data)) {
						// ! Fix this shit firing when it shouldn't
						this.log.info(
							"OID found: " +
								oidPattern.exec(request_post_data) +
								"\nTest: " +
								oidPattern.test(request_post_data)
						);
						this.requestData.__oid = oidPattern.exec(request_post_data)![1];
					}
					if (request_post_data && vmidPattern.test(request_post_data)) {
						this.log.info("VMID found");
						this.requestData.__vmid = vmidPattern.exec(request_post_data)![1];
					}
					if (request_post_data && sidPattern.test(request_post_data)) {
						this.log.info("SID found");
						this.requestData.__sid = sidPattern.exec(request_post_data)![1];
					}
					if (request_post_data && componentIdPattern.test(request_post_data)) {
						this.log.info("COMPONENT ID found");
						this.requestData.__componentId =
							componentIdPattern.exec(request_post_data)![1];
					}

					request.continue();
				})
				.catch((error) => {
					request.continue();
				});
		});
	}

	async getAbsencePage() {
		await this.page.goto(
			"https://spseol-login.edookit.net/#handler/page/absences-to-excuse",
			{ waitUntil: "networkidle2" }
		);
		await this.page.waitForSelector(".eg_top_panel", { timeout: 0 });
		this.log.info("Absence page loaded");
	}

	async setClassName() {
		await this.page.waitForSelector("input[name=filter_pgroup_id]", {
			timeout: 0,
		});
		await this.page.type("input[name=filter_pgroup_id]", "2L", { delay: 50 });
		await this.page.keyboard.press("Enter");

		await sleep(700);
	}

	async getAbsenceData() {
		await this.page.waitForSelector(".eg_grid_table", { timeout: 0 });
		const table = await this.page.$(".eg_grid_table");
		if (table === null) {
			return [];
		}
		const tableData: AbsenceData[] = await table.$$eval("tr", (trs) => {
			const tableData: AbsenceData[] = [];
			for (const tr of trs) {
				const data = {
					name:
						tr.querySelector(".c2")?.innerHTML.replace(/(<([^>]+)>)/gi, "") ??
						"",
					absence:
						tr
							.querySelector(".c10")
							?.innerHTML.replace(/(<([^>]+)>)/gi, "")
							.replace(
								/([\d]{1,2}[.])+\s[\d]{1,2}[:][\d]{1,2}\s[\S]*\s[\S][.]/gi,
								""
							) ?? "",
					excuse:
						tr
							.querySelector(".c11")
							?.innerHTML.replace(/(<([^>]+)>)/gi, "")
							.replace(
								/([\d]{1,2}[.])+\s[\d]{1,2}[:][\d]{1,2}\s[\S]*\s[\S][.]/gi,
								""
							) ?? "",
					lesson:
						tr.querySelector(".c3")?.innerHTML.replace(/(<([^>]+)>)/gi, "") ??
						"",
					date:
						tr.querySelector(".c4")?.innerHTML.replace(/(<([^>]+)>)/gi, "") ??
						"",
					rid: parseInt(tr.getAttribute("rid") ?? "0"),
				};
				tableData.push(data);
			}

			return tableData;
		});

		for (const data of tableData) {
			if (data?.absence?.includes("&nbsp;")) {
				data.absence = data.absence.replace("&nbsp;", "");
			}
			if (data?.excuse?.includes("&nbsp;")) {
				data.excuse = data.excuse.replace("&nbsp;", "");
			}
		}

		this.absenceData = tableData;
		return tableData;
	}

	async excuseStudents(absenceDataArray: AbsenceData[]) {
		if (
			this.requestData.__oid !== "" &&
			this.requestData.__tid !== "" &&
			this.requestData.__vmid !== ""
		) {
			for (const absenceData of absenceDataArray) {
				this.poshSync.appendAbsenceExcuse(absenceData);
			}
		} else {
			this.log.error("Data is not ready");
		}
	}

	syncAbsence() {
		this.poshSync.initialize();
		this.poshSync.syncAbsence();
	}
}
