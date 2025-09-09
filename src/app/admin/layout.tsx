import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Keep admin page free of extra wrappers; the page component provides
  // the Sidebar layout (identical to the user dashboard) to avoid style drift.
  return <>{children}</>;
}
