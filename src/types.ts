/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MindAnalysisResult {
  emotion: string;      // 키워드 와 이모지, e.g. "기쁨 가득! 🌟"
  description: string;  // "우리 친구," 로 시작하는 한글 2~3문장 분석글
  isThatRight: string;  // "~인 것 같아요. 제 말이 맞나요? 🥰"
  tags: string[];       // 디테일 특징 태그 리스트, e.g. ["윙크하는 눈", "브이 포즈"]
}

export interface SavedEmotionRecord {
  id: string;               // UUID/유니크 타임스탬프 ID
  photoUrl: string;         // 사진의 Base64 데이터 URL (미러링 처리된)
  emotion: string;          // 주된 감정
  description: string;      // 상세 묘사구
  isThatRight: string;      // 공감 질문구
  tags: string[];           // 특징 태그들
  timestamp: string;        // 기록 시각 (예: "2026.05.25 13:02")
  isConfirmed: boolean | null; // "맞나요?" 에 신호를 남겼는지 여부 (true = 맞아요! / false = 아니에요!)
}
