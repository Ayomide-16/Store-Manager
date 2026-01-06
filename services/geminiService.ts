
import { GoogleGenAI } from "@google/genai";

export const getBusinessInsights = async (userPrompt: string, shopContext: any) => {
  // CRITICAL: Initialize right before use to catch the latest API_KEY from the selection dialog
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `
    You are an expert Business Intelligence Assistant for a Nigerian retail shop.
    You have access to the shop's current data including inventory levels, sales trends, and profits.
    The user is the Shop Admin.
    Always provide data-driven recommendations based on the provided context.
    Use Nigerian Naira (₦) for currency.
    Format your response with Markdown for readability.
    Context Data: ${JSON.stringify(shopContext)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    // Propagate error details to the UI for special handling (e.g. 403/404)
    throw error;
  }
};
