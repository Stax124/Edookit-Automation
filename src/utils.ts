export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getEncodedCookie(cookie: {
	lastReqTime: string;
	PHPSESSID: string;
	EDOOKIT_ENV: string;
	X$LoginId$System: string;
	__rst: string;
}) {
	return encodeURIComponent(
		`lastReqTime=${cookie.lastReqTime}; PHPSESSID=${cookie.PHPSESSID}; EDOOKIT_ENV=${cookie.EDOOKIT_ENV}; X-LoginId-System=${cookie.X$LoginId$System}; __rst=${cookie.__rst}`
	);
}
