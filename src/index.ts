import puppeteer from "puppeteer";
import { Logger } from "tslog";
import { Scraper } from "./scraper";

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
	const scraper = new Scraper(log, page);
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

	await scraper.getAbsencePage();
	await scraper.getCookies();
	await scraper.setClassName();

	// // !!! If name is data instead, everything works fine
	// // Filter all entries that have excuse or absence empty
	const tableData = await scraper.getAbsenceData();
	const absenceData = tableData.filter((data) => data.absence || data.excuse);
	log.info(absenceData);

	log.info(scraper.requestData);

	if (absenceData.length > 0) {
		await scraper.excuseStudents(absenceData);
	}

	// await excuseStudents(page, absenceData);
}

main();
