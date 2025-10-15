"use server"

import process from "process"
import { db } from "../index"

async function seed() {
  console.warn("Seeding database...")

  // Customer/user seeding removed - using Basic Auth for admin routes only
  // Add treasury/company seeding here if needed in the future

  console.warn("Seeding complete (no data to seed)!")
  db.$client.end()
}

seed().catch(error => {
  console.error("Error seeding database:", error)
  process.exit(1)
})
