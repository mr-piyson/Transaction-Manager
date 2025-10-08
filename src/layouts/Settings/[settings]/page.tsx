"use client";

import { useParams } from "next/navigation";

import { AccountSettings } from "@/layouts/Settings/Account-settings";
import { AppearanceSettings } from "@/layouts/Settings/Appearance-settings";
import { ProfileSettings } from "@/layouts/Settings/Profile/Profile-settings";
import { SecuritySettings } from "@/layouts/Settings/Security-settings";
import VehiclesSettings from "../Vehicles/Vehicles-Settings";

export default function SettingsTab() {
	const pathname = useParams();
	switch (pathname.settings) {
		case "Account":
			return <AccountSettings />;
		case "Security":
			return <SecuritySettings />;
		case "Appearance":
			return <AppearanceSettings />;
		case "Profile":
			return <ProfileSettings />;
		case "Vehicles":
			return <VehiclesSettings />;
		default:
			return <ProfileSettings />;
	}
}
