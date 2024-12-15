/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";

const pickAndPlaceFunction: FunctionDeclaration = {
  name: "pick_and_place",
  description: "Controls the ROARM-M2 to pick and place an object.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      target: { type: SchemaType.STRING, description: "Object to interact with" },
      action: { type: SchemaType.STRING, description: "Action to perform: 'pick' or 'place'" },
    },
    required: ["target", "action"],
  },
};

const mockPickAndPlace = (target: string, action: string) => {
  console.log(`Executing ${action} action on ${target}`);
  return { success: false };
};


function AltairComponent() {
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: 'You are my helpful assistant in Robotics. You have an assess to a robotic arm to help me. I will either show you which object you should pick and where to place or tell you. After the action, you should always tell me what you have tried to execute and was it "successful" or "failed".',
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [pickAndPlaceFunction] },
      ],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      const functionCall = toolCall.functionCalls.find(fc => fc.name === pickAndPlaceFunction.name);
  
      if (functionCall) {
        // Extract arguments passed from Gemini
        const { target, action } = functionCall.args as { target: string; action: string };
  
        // Call your function
        const result = mockPickAndPlace(target, action);
  
        // Send the result back to Gemini
        client.sendToolResponse({
          functionResponses: [
            {
              response: result,
              id: functionCall.id,
            },
          ],
        });
      }
    };
  
    // Attach listener
    client.on("toolcall", onToolCall);
  
    // Cleanup on unmount
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);
}

export const Altair = AltairComponent as React.ComponentType<any>;
