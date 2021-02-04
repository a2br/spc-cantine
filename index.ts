import fetch from "node-fetch";
import xml from "xml2js";

async function fetchMenu(): Promise<string> {
	const res = await fetch(
		"https://www.saintpierrechanel.fr/copie-de-restauration"
	);
	const data = await res.text();
	return data;
}
function toJson(html: string): Promise<Record<string, any>> {
	return xml.parseStringPromise(html, { strict: false });
}

function processData(
	data: Record<string, any>
): {
	week: { from: string; to: string };
	supplements: string;
	days: {
		name: string;
		menuItems: string[];
	}[];
} {
	const body = data.HTML.BODY[0];
	const site = body.DIV[0].DIV[0];
	const junction = site.DIV.find(
		(d: any) => d.$.ID === "site-root"
	).DIV[0].MAIN[0].DIV[0].DIV[0].DIV[0].DIV.find(
		(d: any) => d.$.CLASS === "_2S9ms"
	).DIV[0].DIV[0].DIV[0];
	const cross: any[] = junction.SECTION[0].DIV[1].DIV;

	const joinableStarts: Array<{ str: string; join: string }> = [
		{ str: "au ", join: " " },
	];
	const joinableEnds: Array<{ str: string; join: string }> = [
		{ str: " au", join: " " },
		{ str: " au ", join: "" },
	];

	const menu = cross
		// Main transformation
		.map((road: Record<string, any>): {
			name: string;
			menuItems: string[];
		} => {
			const path = road.DIV.find(
				(d: Record<string, any>) => d.$["DATA-TESTID"] === "inline-content"
			).DIV[0];
			const name = path.DIV.find(
				(d: Record<string, any>) => d.$.ROLE === "button"
			).DIV[0].SPAN[0]._;
			const menuItemsRaw: any[] = path.DIV.find(
				(d: Record<string, any>) => d.$["ARIA-LABEL"] === "Matrix gallery"
			).DIV.find(
				(d: Record<string, any>) =>
					d.$["DATA-TESTID"] === "matrix-gallery-items-container"
			).DIV;
			const menuItems = menuItemsRaw.map(
				(item: Record<string, any>): string =>
					item.DIV[0].DIV[0].DIV[0].DIV[0]["WIX-IMAGE"][0].IMG[0].$.ALT
			);
			return {
				name,
				menuItems,
			};
		});

	const [from, to] = junction.DIV.find((d: any) => d.$.ID === "comp-jpntrto6")
		.H2[0].SPAN[0].SPAN[0]._.substr("Menu du ".length)
		.split(" au ");
	const supplements = junction.DIV.find((d: any) => d.$.ID === "comp-jzwnw9u8")
		.P[0].SPAN[0].SPAN[0]._.replace(/(\t|\r)/g, "")
		.replace(/(\n)/g, " ")
		.substr("Suppléments au lycée : ".length);

	return {
		week: { from, to },
		supplements,
		days: menu,
	};
}

export async function getMenu(): Promise<{
	week: { from: string; to: string };
	supplements: string;
	days: {
		name: string;
		menuItems: string[];
	}[];
}> {
	const fetched = await fetchMenu();
	const parsed = await toJson(fetched);
	const processed = processData(parsed);
	return processed;
}
