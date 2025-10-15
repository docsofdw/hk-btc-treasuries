// import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"

// const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"])

// Disabled Clerk authentication for MVP
export default function middleware(req: NextRequest) {
  // Check if this is an admin route
  if (req.nextUrl.pathname.startsWith("/admin")) {
    // Get the Authorization header
    const authHeader = req.headers.get("authorization")
    const expectedAuth = process.env.ADMIN_BASIC_AUTH

    // If no expected auth is configured, deny access
    if (!expectedAuth) {
      return new NextResponse("Admin auth not configured", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
        },
      })
    }

    // Check if auth header matches expected auth
    if (!authHeader || authHeader !== expectedAuth) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Admin"',
          "Content-Type": "text/plain",
        },
      })
    }
  }

  return NextResponse.next()
}

// export default clerkMiddleware(async (auth, req) => {
//   const { userId, redirectToSignIn } = await auth()

//   if (!userId && isProtectedRoute(req)) {
//     return redirectToSignIn()
//   }

//   return NextResponse.next()
// })

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)"
  ]
}
