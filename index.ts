import fetch from "node-fetch";
import xml from "xml2js";

const URL = "https://www.saintpierrechanel.fr/restauration";

export class ParseError extends Error {
	constructor(public typeError: TypeError) {
		super(
			"A parsing error of the menu occured. This most likely means the library is outdated and requires an update."
		);
	}
}

async function fetchMenu(): Promise<string> {
	const res = await fetch(URL);
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
	const site = body.DIV[0] /* id="SITE_CONTAINER" */.DIV[0]; /* id="MAIN_MF" */
	const junction = site.DIV.find((d: any) => d.$.ID === "site-root").DIV[0].MAIN[0].DIV[0].DIV[0].DIV[0].DIV[1].DIV[0]
		.DIV[0].DIV[0];
	const cross: any[] = junction.SECTION[0].DIV[1].DIV; // Columns

	const menu = cross
		// Main transformation
		.map((road: Record<string, any>): {
			name: string;
			menuItems: string[];
		} => {
			const path = road.DIV.find((d: Record<string, any>) => d.$["DATA-TESTID"] === "inline-content").DIV[0];
			const name = path.DIV.find((d: Record<string, any>) => d.$.ROLE === "button").DIV[0].SPAN[0]._.trim();
			const menuItemsRaw: any[] = path.DIV.find(
				(d: Record<string, any>) => d.$["ARIA-LABEL"] === "Matrix gallery"
			).DIV.find((d: Record<string, any>) => d.$["DATA-TESTID"] === "matrix-gallery-items-container").DIV;
			const menuItems = menuItemsRaw.map((item: Record<string, any>): string => {
				const itemObj = item.DIV[0].DIV[0].DIV[0].DIV[0];
				// const alt = itemObj["WIX-IMAGE"][0].IMG[0].$.ALT;
				const text: string = itemObj["DIV"][0].DIV[0].DIV[0]._;
				const otherLines = itemObj["DIV"][0].DIV[0].P;
				const line2: string = otherLines ? otherLines[0]._ : "";
				const final = (line2 ? [text, line2].join(" ") : text).trim();
				return final;
			});
			return {
				name,
				menuItems,
			};
		});

	const [from, to]: [string, string] = junction.DIV[2].H2[0].SPAN[0].SPAN[0].SPAN[0]._.substr("Menu du ".length)
		.split(" au ")
		.map((e: string) => e.trim());

	const supplements: string = junction.DIV[4].P[0].SPAN[0].SPAN[0].SPAN[0]._.replace(/(\t|\r)/g, "")
		.replace(/(\n)/g, " ")
		.substr("Suppléments au lycée : ".length)
		.trim();

	return {
		week: { from, to },
		supplements,
		days: menu,
	};
}

export interface formattedMenu {
	week: {
		/**
		 * @example "01/02/2021"
		 */
		from: string;
		/**
		 * @example "05/02/2021"
		 */
		to: string;
	};
	/**
	 * @example "/"
	 */
	supplements: string;
	/**
	 * @description Devrait contenir 5 éléments, pour chaque colonne du tableau et chaque jour
	 */
	days: Array<{
		/**
		 * @example "MARDI"
		 */
		name: string;
		/**
		 * @example
		 * [
		 * 	"Tomate féta",
		 * 	"Kebab",
		 * 	"Pommes vapeur",
		 * 	"Duo de carottes",
		 * 	"Vache qui rit",
		 * 	"Moelleux aux fruits"
		 * ]
		 */
		menuItems: Array<string>;
	}>;
}

export async function getMenu(): Promise<formattedMenu> {
	const fetched = await fetchMenu();
	const parsed = await toJson(fetched);
	try {
		const processed = processData(parsed);
		return processed;
	} catch (err) {
		if (err instanceof TypeError) throw new ParseError(err);
		throw err;
	}
}

export default getMenu;
