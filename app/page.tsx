import catalog from "@/data/catalog.json";
import type { Catalog } from "@/lib/catalog";
import RadioApp from "./components/RadioApp";

export default function Home() {
  return <RadioApp catalog={catalog as unknown as Catalog} />;
}
