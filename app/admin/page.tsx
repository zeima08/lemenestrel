import type { Metadata } from "next";
import catalog from "@/data/catalog.json";
import type { Catalog } from "@/lib/catalog";
import AdminPanel from "./AdminPanel";

export const metadata: Metadata = { title: "Admin — Le Ménestrel" };

export default function AdminPage() {
  return <AdminPanel initial={catalog as unknown as Catalog} />;
}
