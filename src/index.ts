import prompts from "prompts";
import puppeteer from "puppeteer";
import { Logger } from "tslog";
import { AbsenceScraper } from "./absenceScraper";

const log = new Logger();

const options = {
	width: 1920,
	height: 1080,
};

async function main() {
	const browser = await puppeteer.launch({
		headless: false,
		executablePath:
			"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		userDataDir: "C:\\Users\\Admin\\AppData\\Local\\Google\\Chrome\\User Data",
		args: [`--window-size=${options.width},${options.height}`],
		defaultViewport: {
			width: options.width,
			height: options.height,
		},
	});

	const page = await browser.newPage();
	const scraper = new AbsenceScraper(log, page);
	scraper.initPage();

	await page.goto("https://spseol-login.edookit.net/", {
		waitUntil: "networkidle2",
	});

	if ((await page.$("#passwd")) !== null) {
		log.info("Login page detected, please log in...");
	} else {
		log.info("Login is already done");
	}

	await page.waitForSelector(".menu_box_in", { timeout: 0 });
	log.info("Main page loaded");

	log.info("Getting absence page...");
	await scraper.getAbsencePage();
	log.info("Getting cookies...");
	await scraper.getCookies();
	log.info("Setting class name...");
	await scraper.setClassName();

	log.info("Getting absence data and filtering...");
	const tableData = await scraper.getAbsenceData();
	const absenceData = tableData.filter((data) => data.absence || data.excuse);

	log.info(scraper.requestData);
	log.info(scraper.cookies);

	log.info("Appending excuses...");
	if (absenceData.length > 0) {
		await scraper.excuseStudents(absenceData);
	}

	log.info("Syncing absence...");

	const confirm = await prompts({
		type: "confirm",
		name: "value",
		message: "Are you sure you want to sync?",
	});

	if (confirm.value) {
		scraper.syncAbsence();
	}
	log.info("Absence synced!");

	await browser.close();
}

main();
