import React, { useState, useRef } from "react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { motion } from "framer-motion";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = "auto";

const RealtimeTranslator = () => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const recognitionRef = useRef(recognition);

  const handleListen = () => {
    if (!listening) {
      setTranscript("");
      recognitionRef.current.start();
      setListening(true);

      recognitionRef.current.onresult = async (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            setTranscript((prev) => prev + " " + text);
            detectAndTranslate(text);
          } else {
            interimTranscript += text;
          }
        }
      };

      recognitionRef.current.onerror = (e) => {
        console.error("Speech recognition error", e);
        setListening(false);
      };
    } else {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const detectAndTranslate = async (text) => {
    try {
      // 1. Detect language
      const detectedLangRes = await fetch("https://libretranslate.de/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text }),
      });

      const detectedLang = await detectedLangRes.json();
      const lang = detectedLang[0].language;

      // 2. Decide target: if Italian, translate to English; else to Italian
      const targetLang = lang === "it" ? "en" : "it";

      // 3. Translate
      const translateRes = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: lang,
          target: targetLang,
          format: "text",
        }),
      });

      const data = await translateRes.json();
      setTranslation(data.translatedText);
    } catch (error) {
      console.error("Translation error", error);
    }
  };

  return (
    <div className="p-4 grid gap-4 max-w-xl mx-auto">
      <motion.h1 className="text-2xl font-bold text-center">
        Traduttore Vocale in Tempo Reale
      </motion.h1>
      <Button onClick={handleListen}>{listening ? "Ferma" : "Ascolta"}</Button>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-gray-500">Trascrizione:</p>
          <p>{transcript}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-gray-500">Traduzione:</p>
          <p className="font-medium text-lg">{translation}</p>
        </CardContent>
      </Card>
    </div>
  );
};
export default RealtimeTranslator;
