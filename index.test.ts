import { getMenu } from ".";

it("retrieves menu", async () => {
	const menu = await getMenu();
	console.log(menu);
	expect(menu).toBeTruthy();
});
