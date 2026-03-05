import { z } from 'zod';

export const scanInputSchema = z.object({
  website_url: z.string().min(3),
  city_or_zip: z.string().min(2).max(120),
  shop_name: z.string().min(2).max(120),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  has_i_car: z.boolean().optional(),
  has_oem: z.boolean().optional(),
  has_adas: z.boolean().optional(),
  has_aluminum: z.boolean().optional(),
  consented: z.literal(true)
});

export type ScanInput = z.infer<typeof scanInputSchema>;
