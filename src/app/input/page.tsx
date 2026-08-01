export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { InputPageClient } from "./InputPageClient";

export default function InputPage() {
  return (
    <Suspense fallback={null}>
      <InputPageClient />
    </Suspense>
  );
}
