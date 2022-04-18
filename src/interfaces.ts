export interface AbsenceData {
	name: string;
	absence: string;
	excuse: string;
	rid: number;
}

export interface CookieInterface {
	lastReqTime: string;
	PHPSESSID: string;
	EDOOKIT_ENV: string;
	X$LoginId$System: string;
	__rst: string;
}

export interface RequestDataInterface {
	__oid: string;
	__tid: string;
	__vmid: string;
	__sid: string;
	__componentId: string;
}
