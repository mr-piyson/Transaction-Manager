import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function Page(props: any) {


	return (
		<>
			<div className="flex items-center justify-center w-full h-full ">
				<h1>This is the Landding page</h1>
				<Link href="/Auth">
				<Button>Login</Button>
				</Link>
			</div>
		</>
	);
}
