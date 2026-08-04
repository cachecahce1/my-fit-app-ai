import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Next 16: proxy.ts replaces middleware.ts. Refreshes the Supabase session
// cookie and gates every page behind login.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path0 = request.nextUrl.pathname;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // No Supabase yet — send everything to the setup screen on /login
    if (!path0.startsWith("/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (all) => {
          all.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          all.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // API routes return their own 401s — redirecting them to an HTML page breaks fetch()
  const isPublic = path.startsWith("/login") || path.startsWith("/auth") || path.startsWith("/api");
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest).*)"],
};
