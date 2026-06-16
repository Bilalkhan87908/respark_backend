import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { validate, schemas } from "../../middlewares/validate.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { registerPublicPhase3Routes } from "./phase3.js";

export const publicRouter = Router();

publicRouter.get("/settings", asyncHandler(async (req, res) => {
  const settings = await prisma.globalSetting.findFirst();
  res.json(
    settings || {
      systemName: "Skillify ERP",
      maintenanceMode: false,
      whatsappNumber: "+919876543210",
      contactEmail: "hello@skillify.local",
      supportEmail: "support@skillify.local",
      defaultCurrency: "INR",
      currencyOptions: ["INR", "USD", "AED"],
      defaultCountry: "India",
      defaultCity: "Mumbai",
      termsUrl: "/terms",
      privacyUrl: "/privacy",
      demoBookingUrl: "",
      blogTitle: "Skillify Operations Workspace",
      blogIntro: "Manage services, appointments, billing, customers, and team workflows from one focused salon portal."
    },
    
  );
}));

publicRouter.get("/salon/:slug", asyncHandler(async (req, res) => {
  const salon = await prisma.salon.findUnique({ 
    where: { slug: req.params.slug },
    include: {
      websiteConfig: true,
      catalogSettings: true,
      ecommerceSettings: true,
      settings: { where: { branchId: null }, take: 1 }
    }
  });
  if (!salon) return res.status(404).json({ message: "Salon not found" });
  const catalogSettings = salon.catalogSettings.find((item) => item.branchId === null) || salon.catalogSettings[0] || null;
  if (catalogSettings?.catalogEnabled === false) return res.status(403).json({ message: "Public catalog is disabled for this salon" });

  const ecommerceSettings = salon.ecommerceSettings[0] || null;
  const salonSettings = salon.settings[0] || null;
  const genericSettings = typeof salonSettings?.advancedSettings === "object"
    ? salonSettings.advancedSettings?.genericSettings || {}
    : {};
  const normalizedGenericSettings = {
    ...genericSettings,
    defaultCurrency: genericSettings.defaultCurrency || genericSettings.currency || salon.currency || "INR"
  };
  const legalContent = typeof salonSettings?.advancedSettings === "object"
    ? salonSettings.advancedSettings?.legalContent || {}
    : {};
  const footerContent = typeof salonSettings?.advancedSettings === "object"
    ? salonSettings.advancedSettings?.footerContent || {}
    : {};
  const showServices = catalogSettings?.showServices !== false;
  const showProducts = catalogSettings?.showProducts !== false && ecommerceSettings?.storeEnabled === true;

  const [services, products] = await Promise.all([
    showServices ? prisma.service.findMany({ where: { salonId: salon.id, isActive: true, isPublicVisible: true } }) : [],
    showProducts ? prisma.product.findMany({ where: { salonId: salon.id, isActive: true, isOnlineVisible: true }, include: { category: true, branch: true } }) : []
  ]);
  res.json({
    salon: { ...salon, settings: undefined, catalogSettings: undefined, ecommerceSettings: undefined },
    services,
    products,
    websiteConfig: salon.websiteConfig || { heroTitle: "", heroSubtitle: "", heroImage: "" },
    genericSettings: normalizedGenericSettings,
    legalContent,
    footerContent,
    catalogSettings,
    ecommerceSettings,
    visibility: {
      services: showServices,
      products: showProducts,
      packages: catalogSettings?.showPackages !== false,
      memberships: catalogSettings?.showMemberships !== false,
      staff: catalogSettings?.showStaffPortfolio !== false
    }
  });
}));

registerPublicPhase3Routes(publicRouter);

publicRouter.post("/demo-leads", asyncHandler(async (req, res) => {
  const { name, phone, email, salonName, city } = req.body;
  if (!name || !phone) return res.status(400).json({ message: "Name and phone are required" });
  const lead = await prisma.demoLead.create({
    data: { name, phone, email: email || null, salonName: salonName || null, city: city || null }
  });
  res.status(201).json(lead);
}));

publicRouter.get("/plans", asyncHandler(async (req, res) => {
  const plans = await prisma.plan.findMany({ orderBy: { price: "asc" } });
  res.json(plans.length ? plans : [
    { id: "starter", name: "Starter", price: 0, description: "Get started with basic features", features: ["Up to 10 staff", "Basic reports", "Email support"] },
    { id: "growth", name: "Growth", price: 4999, description: "For growing salons", features: ["Unlimited staff", "Advanced reports", "Priority support", "WhatsApp integration"] },
    { id: "enterprise", name: "Enterprise", price: 9999, description: "Full suite for large chains", features: ["Multi-branch", "API access", "Custom integrations", "Dedicated manager"] }
  ]);
}));
