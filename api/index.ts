import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let ai: GoogleGenAI | null = null;
function getGenAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[Warning] GEMINI_API_KEY is not defined in environment variables.");
      return null;
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.post("/api/analyze", async (req: express.Request, res: express.Response) => {
  try {
    const clientAI = getGenAI();
    if (!clientAI) {
      res.status(500).json({
        error: "Gemini API의 API키가 설정되지 않았습니다. Vercel 대시보드 > Settings > Environment Variables에서 GEMINI_API_KEY를 추가해주세요.",
      });
      return;
    }

    const { image } = req.body;
    if (!image) {
      res.status(400).json({ error: "이미지 데이터가 전달되지 않았습니다." });
      return;
    }

    let base64Data = image;
    let mimeType = "image/png";

    if (image.includes(";base64,")) {
      const parts = image.split(";base64,");
      const match = parts[0].match(/data:(.*)/);
      if (match) {
        mimeType = match[1];
      }
      base64Data = parts[1];
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: `사진 속 인물의 감정, 얼굴 표정, 손/팔 포즈를 깊고 다정하게 분석해줘.

분석가 가이드라인에 맞춰 JSON으로 응답해줘:
1. description: 문장의 첫 시작은 반드시 "우리 친구,"로 시작해야만 해. 그 다음 눈썹, 눈 (또는 윙크), 입술, 볼 등 미세한 표정 상태와 '브이', '꽃받침', '손하트' 등의 손/팔 포즈를 세밀하고 사랑스럽게 묘사하는 문장을 한국어 2~3개의 자연스럽고 다정한 문장으로 표현해줘. (예시: "우리 친구, 무언가 흥미로운 것을 발견했는지 고개를 살짝 돌려 초롱초롱한 눈빛으로 바라보고 있네요. 살짝 벌어진 입술과 진지하면서도 차분한 표정에서 무언가에 집중하고 있는 마음이 고스란히 느껴집니다.")
2. emotion: 감정을 한눈에 파악할 수 있는 핵심 키워드와 분위기를 살려줄 예쁜 이모지(예: "짱 신남! 😆", "수줍은 미소 😊", "사랑 가득 하트 💖", "장난꾸러기 브이 ✌️")로 표현해줘.
3. isThatRight: 감정의 원인이나 시각적 특징의 의미를 부드럽게 질문하는 다독임 문장. 끝부분은 반드시 질문 형태(~것 같은데 맞나요?, ~인 것 같아요. 제 말이 맞나요? 🥰처럼)로 끝나야 하며, 문장 끝에는 물음표(?)가 꼭 들어가야 해. (예시: "우리 친구, 무언가 흥미로운 것을 발견했는지 고개를 살짝 돌려 초롱초롱한 눈빛으로 바라보고 있네요. 살짝 벌어진 입술과 진지하면서도 차분한 표정에서 무언가에 집중하고 있는 것 같은데 맞나요?")
4. tags: 감지된 디테일한 특징을 한글 태그 리스트로 최대 5개까지 추출 (예: ["윙크 눈빛", "활짝 웃는 입술", "손가락 보자기", "귀여운 꽃받침"])`,
    };

    const response = await clientAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotion: {
              type: Type.STRING,
              description: "대표 감정 키워드와 감성적인 이모지 결합",
            },
            description: {
              type: Type.STRING,
              description: "'우리 친구,' 로 무조건 시작하며 표정과 제스처를 따뜻하게 묘사하는 2~3문장의 문구",
            },
            isThatRight: {
              type: Type.STRING,
              description: "상대방의 마음을 헤아리고 '맞나요?' 로 다정하게 소통하는 마무리 문구",
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "사진 속에서 감지된 시각적 형태 분석 태그 리스트 (최대 5개)",
            },
          },
          required: ["emotion", "description", "isThatRight", "tags"],
        },
      },
    });

    const parsedResponse = JSON.parse(response.text || "{}");
    res.json(parsedResponse);
  } catch (err: unknown) {
    console.error("AI Analysis error:", err);
    const message = err instanceof Error ? err.message : "AI 분석에 실패했습니다.";
    res.status(500).json({ error: message });
  }
});

export default app;
