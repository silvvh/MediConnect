import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Permitir acesso à rota de callback de autenticação sem verificação
  if (request.nextUrl.pathname.startsWith("/auth/callback")) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rotas protegidas
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Buscar role do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role;

    // Redirecionar /dashboard para dashboard específico do role
    if (request.nextUrl.pathname === "/dashboard") {
      if (userRole === "doctor") {
        return NextResponse.redirect(new URL("/dashboard/doctor", request.url));
      } else if (userRole === "patient") {
        return NextResponse.redirect(new URL("/dashboard/patient", request.url));
      } else if (userRole === "admin") {
        return NextResponse.redirect(new URL("/dashboard/admin", request.url));
      } else if (userRole === "attendant") {
        return NextResponse.redirect(new URL("/dashboard/attendant", request.url));
      }
    }

    // Proteger rotas específicas por role
    if (request.nextUrl.pathname.startsWith("/dashboard/patient")) {
      if (userRole !== "patient") {
        // Redirecionar para dashboard correto
        if (userRole === "doctor") {
          return NextResponse.redirect(new URL("/dashboard/doctor", request.url));
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    if (request.nextUrl.pathname.startsWith("/dashboard/doctor")) {
      if (userRole !== "doctor") {
        if (userRole === "patient") {
          return NextResponse.redirect(new URL("/dashboard/patient", request.url));
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    if (request.nextUrl.pathname.startsWith("/dashboard/admin")) {
      if (userRole !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    if (request.nextUrl.pathname.startsWith("/dashboard/attendant")) {
      if (userRole !== "attendant") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  // Redirecionar usuários autenticados que tentam acessar páginas de auth
  if (
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register")
  ) {
    if (user) {
      // Buscar role para redirecionar corretamente
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role;
      if (userRole === "doctor") {
        return NextResponse.redirect(new URL("/dashboard/doctor", request.url));
      } else if (userRole === "patient") {
        return NextResponse.redirect(new URL("/dashboard/patient", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
