/**
 * Compress and convert image file to base64 (without data URL prefix)
 * @param file - The image file to process
 * @param maxSize - Maximum dimension (width or height) in pixels
 * @param quality - JPEG compression quality (0-1)
 * @returns Base64 encoded string without data URL prefix
 */
export async function prepareImageFile(
  file: File,
  maxSize: number = 800,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }

          const reader2 = new FileReader();
          reader2.onload = () => {
            const result = reader2.result as string;
            // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = result.split(",")[1];
            resolve(base64);
          };
          reader2.onerror = reject;
          reader2.readAsDataURL(blob);
        },
        "image/jpeg",
        quality
      );
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Call the fertilizer recommendation API directly
 * @param payload - Request payload containing crop and soil data
 * @returns Recommendation result from the edge function
 */
export async function callRecommendationApi(payload: {
  cropType: string;
  soilType: string;
  pH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicCarbon: number;
  latitude?: number;
  longitude?: number;
  imageBase64?: string | null;
}): Promise<any> {
  const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/getFertilizerRecommendation`;

  const response = await fetch(FUNC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "unknown" }));
    throw new Error(err.error || "Edge function error");
  }

  return await response.json();
}
