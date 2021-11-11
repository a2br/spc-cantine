import { getMenu } from ".";

it("retrieves menu", async () => {
	const menu = await getMenu();
	expect(menu).toBeTruthy();
});
