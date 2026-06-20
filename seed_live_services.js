import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load environment variables (ensure DATABASE_URL points to the live railway DB if running locally)
dotenv.config();

const prisma = new PrismaClient();

async function run() {
  console.log("Connecting to database:", process.env.DATABASE_URL.split("@")[1]); // print host info safely

  // Get the main salon ID
  const salon = await prisma.salon.findFirst();
  if (!salon) {
    console.log("No Salon found in the database. Aborting.");
    process.exit(1);
  }
  const salonId = salon.id;

  console.log("Salon ID found:", salonId);

  try {
    // 1. Delete all existing services, service categories, etc.
    console.log("Deleting all existing services and categories...");
    
    // Disconnect relationships first if needed (StaffAssignments etc.)
    await prisma.staffServiceAssignment.deleteMany({ where: { service: { salonId } } });
    await prisma.appointmentServiceStaff.deleteMany({ where: { appointmentService: { service: { salonId } } } });
    await prisma.appointmentService.deleteMany({ where: { service: { salonId } } });
    await prisma.packageService.deleteMany({ where: { service: { salonId } } });
    await prisma.membershipPlanService.deleteMany({ where: { service: { salonId } } });

    // Now delete services
    await prisma.service.deleteMany({ where: { salonId } });
    
    // Now delete categories
    await prisma.serviceCategory.deleteMany({ where: { salonId } });
    
    console.log("Old services and categories deleted successfully.");

    // 2. Insert new demo data
    console.log("Inserting new demo categories, subcategories, and services...");

    // Category 1: Hair Care
    const hairCare = await prisma.serviceCategory.create({
      data: { salonId, name: "Hair Care" }
    });

    // Subcategories for Hair Care
    const haircuts = await prisma.serviceCategory.create({
      data: { salonId, name: "Haircuts", parentId: hairCare.id }
    });
    const hairColoring = await prisma.serviceCategory.create({
      data: { salonId, name: "Hair Coloring", parentId: hairCare.id }
    });
    const hairTreatments = await prisma.serviceCategory.create({
      data: { salonId, name: "Hair Treatments", parentId: hairCare.id }
    });

    // Category 2: Skin Care
    const skinCare = await prisma.serviceCategory.create({
      data: { salonId, name: "Skin Care" }
    });
    const facials = await prisma.serviceCategory.create({
      data: { salonId, name: "Facials", parentId: skinCare.id }
    });
    const cleanups = await prisma.serviceCategory.create({
      data: { salonId, name: "Cleanups & Bleach", parentId: skinCare.id }
    });

    // Category 3: Nail Care
    const nailCare = await prisma.serviceCategory.create({
      data: { salonId, name: "Nail Care" }
    });

    // Category 4: Makeup & Styling
    const makeup = await prisma.serviceCategory.create({
      data: { salonId, name: "Makeup & Styling" }
    });

    // Insert Services
    const servicesData = [
      // Haircuts
      { salonId, categoryId: haircuts.id, name: "Men's Classic Haircut", gender: "MALE", price: 500, durationMin: 30, isPublicVisible: true },
      { salonId, categoryId: haircuts.id, name: "Women's Layered Cut", gender: "FEMALE", price: 1200, durationMin: 45, isPopular: true, isPublicVisible: true },
      { salonId, categoryId: haircuts.id, name: "Kid's Haircut", gender: "UNISEX", price: 300, durationMin: 20, isPublicVisible: true },
      
      // Hair Coloring
      { salonId, categoryId: hairColoring.id, name: "Global Hair Color (Short)", gender: "FEMALE", price: 2500, durationMin: 90, isPublicVisible: true },
      { salonId, categoryId: hairColoring.id, name: "Global Hair Color (Long)", gender: "FEMALE", price: 4000, durationMin: 120, isPublicVisible: true },
      { salonId, categoryId: hairColoring.id, name: "Men's Beard Color", gender: "MALE", price: 400, durationMin: 30, isPublicVisible: true },
      { salonId, categoryId: hairColoring.id, name: "Highlights / Balayage", gender: "FEMALE", price: 5000, durationMin: 150, isFeatured: true, isPublicVisible: true },
      
      // Hair Treatments
      { salonId, categoryId: hairTreatments.id, name: "Keratin Treatment", gender: "UNISEX", price: 6000, durationMin: 180, isPopular: true, isPublicVisible: true },
      { salonId, categoryId: hairTreatments.id, name: "Hair Spa (L'Oreal)", gender: "UNISEX", price: 1500, durationMin: 60, isPublicVisible: true },
      { salonId, categoryId: hairTreatments.id, name: "Anti-Dandruff Treatment", gender: "UNISEX", price: 1200, durationMin: 45, isPublicVisible: true },

      // Facials
      { salonId, categoryId: facials.id, name: "Hydra Facial", gender: "UNISEX", price: 3500, durationMin: 60, isFeatured: true, isPopular: true, isPublicVisible: true },
      { salonId, categoryId: facials.id, name: "O3+ Whitening Facial", gender: "FEMALE", price: 2500, durationMin: 60, isPublicVisible: true },
      { salonId, categoryId: facials.id, name: "Fruit Facial (Basic)", gender: "UNISEX", price: 1000, durationMin: 40, isPublicVisible: true },

      // Cleanups
      { salonId, categoryId: cleanups.id, name: "Deep Cleansing", gender: "UNISEX", price: 800, durationMin: 30, isPublicVisible: true },
      { salonId, categoryId: cleanups.id, name: "Oxy Bleach", gender: "UNISEX", price: 400, durationMin: 20, isPublicVisible: true },

      // Nail Care
      { salonId, categoryId: nailCare.id, name: "Classic Manicure", gender: "UNISEX", price: 600, durationMin: 30, isPublicVisible: true },
      { salonId, categoryId: nailCare.id, name: "Classic Pedicure", gender: "UNISEX", price: 800, durationMin: 45, isPublicVisible: true },
      { salonId, categoryId: nailCare.id, name: "Gel Nail Art", gender: "FEMALE", price: 1500, durationMin: 60, isPopular: true, isPublicVisible: true },
      { salonId, categoryId: nailCare.id, name: "Nail Extensions (Acrylic)", gender: "FEMALE", price: 2500, durationMin: 90, isPublicVisible: true },

      // Makeup & Styling
      { salonId, categoryId: makeup.id, name: "Bridal Makeup", gender: "FEMALE", price: 15000, durationMin: 180, isFeatured: true, isPublicVisible: true },
      { salonId, categoryId: makeup.id, name: "Party Makeup", gender: "FEMALE", price: 3500, durationMin: 60, isPublicVisible: true },
      { salonId, categoryId: makeup.id, name: "Hair Styling & Blow Dry", gender: "FEMALE", price: 800, durationMin: 30, isPublicVisible: true }
    ];

    await prisma.service.createMany({
      data: servicesData
    });

    console.log(`Successfully seeded ${servicesData.length} new demo services!`);

  } catch (error) {
    console.error("Error during seeding:", error);
  } finally {
    await prisma.$disconnect();
    console.log("Done.");
  }
}

run();
