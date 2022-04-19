import { exec } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import {
	AbsenceData,
	CookieInterface,
	RequestDataInterface,
} from "./interfaces";

export class PoshSync {
	cookies: CookieInterface;
	requestData: RequestDataInterface;
	excusePath: string;
	cookiePath: string;
	fullExcuseCall: string;

	constructor(cookies: CookieInterface, requestData: RequestDataInterface) {
		this.cookies = cookies;
		this.requestData = requestData;
		this.fullExcuseCall = "";
		this.excusePath = "./posh-sync/absence-sync.ps1";
		this.cookiePath = "./posh-sync/cookies.json";
	}

	saveCookies() {
		// Save cookies for debugging
		writeFileSync(this.cookiePath, JSON.stringify(this.cookies), {
			encoding: "utf8",
			flag: "w",
		});
	}

	makeSyncDir() {
		if (!existsSync("./posh-sync")) {
			mkdirSync("./posh-sync");
		}
	}

	writeAbsenceHeader() {
		const header = `
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$session.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36"
$session.Cookies.Add((New-Object System.Net.Cookie("__rst", "${this.cookies.__rst}", "/", "spseol-login.edookit.net")))
$session.Cookies.Add((New-Object System.Net.Cookie("X-LoginId-System", "${this.cookies.X$LoginId$System}", "/", "spseol-login.edookit.net")))
$session.Cookies.Add((New-Object System.Net.Cookie("EDOOKIT_ENV", "${this.cookies.EDOOKIT_ENV}", "/", "spseol-login.edookit.net")))
$session.Cookies.Add((New-Object System.Net.Cookie("PHPSESSID", "${this.cookies.PHPSESSID}", "/", "spseol-login.edookit.net")))
$session.Cookies.Add((New-Object System.Net.Cookie("lastReqTime", "${this.cookies.lastReqTime}", "/", "spseol-login.edookit.net")))

`;

		// Write the necessary cookies in
		writeFileSync(this.excusePath, header, {
			encoding: "utf8",
			flag: "w",
		});
	}

	appendAbsenceExcuse(absenceData: AbsenceData) {
		const excuseCall = `
Invoke-WebRequest -UseBasicParsing -Uri "https://spseol-login.edookit.net/handler/grid/lesson_-absences-to-excuse-data" \`
-Method "POST" \`
-WebSession $session \`
-Headers @{
"Accept"="application/json, text/javascript, */*; q=0.01"
  "Accept-Encoding"="gzip, deflate, br"
  "Accept-Language"="en,cs-CZ;q=0.9,cs;q=0.8,de;q=0.7"
  "Origin"="https://spseol-login.edookit.net"
  "Referer"="https://spseol-login.edookit.net/"
  "Sec-Fetch-Dest"="empty"
  "Sec-Fetch-Mode"="cors"
  "Sec-Fetch-Site"="same-origin"
  "X-Request-oid"="${this.requestData.__oid}"
  "X-Request-tid"="${this.requestData.__tid}"
  "X-Request-vmid"="${this.requestData.__vmid}"
  "X-Requested-With"="XMLHttpRequest"
  "sec-ch-ua"="\`" Not A;Brand\`";v=\`"99\`", \`"Chromium\`";v=\`"100\`", \`"Google Chrome\`";v=\`"100\`""
  "sec-ch-ua-mobile"="?0"
  "sec-ch-ua-platform"="\`"Windows\`""
} \`
-ContentType "application/x-www-form-urlencoded; charset=UTF-8" \`
-Body "__operation=save&__index=${absenceData.rid}&real_listattendancestatus_id=4&__vmid=${this.requestData.__vmid}&__oid=${this.requestData.__oid}&__tid=${this.requestData.__tid}&__componentId=${this.requestData.__componentId}&__sid=${this.requestData.__sid}&__compId=__lc_Grid_Lesson_AbsencesToExcuse"
`;

		this.fullExcuseCall += excuseCall;
	}

	appendAbsenceToFile() {
		writeFileSync(this.excusePath, this.fullExcuseCall, {
			encoding: "utf8",
			flag: "a",
		});
	}

	syncAbsence() {
		exec(
			`powershell -executionpolicy bypass -File ${this.excusePath} -File ${this.excusePath}`,
			(err, stdout, stderr) => {
				if (err) {
					console.error(err);
				}
				console.log(stdout);
				console.log(stderr);
			}
		);
	}

	initialize() {
		this.makeSyncDir();
		this.saveCookies();
		this.writeAbsenceHeader();
		this.appendAbsenceToFile();
	}
}
