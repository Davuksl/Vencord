/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

// Получаем доступ к внутренним сторам и экшенам Discord
const MediaEngineActions = findByPropsLazy("setVideoQuality", "setGoLiveSource");
const MediaEngineStore = findByPropsLazy("getGoLiveSource", "getSettings");

let intervalId: NodeJS.Timeout | null = null;
let originalQuality: { width: number; height: number; frameRate: number } | null = null;
let isFlipped = false;

// Список случайных разрешений (ширина, высота, FPS)
const RANDOM_RESOLUTIONS = [
    { width: 1280, height: 720, frameRate: 30 },
    { width: 1920, height: 1080, frameRate: 60 },
    { width: 854, height: 480, frameRate: 15 },
    { width: 640, height: 360, frameRate: 30 },
    { width: 2560, height: 1440, frameRate: 60 }
];

function getRandomResolution() {
    const index = Math.floor(Math.random() * RANDOM_RESOLUTIONS.length);
    return RANDOM_RESOLUTIONS[index];
}

function applyResolution(res: { width: number; height: number; frameRate: number }) {
    if (!MediaEngineActions) return;

    // Обновляем настройки качества стрима
    if (typeof MediaEngineActions.setVideoQuality === "function") {
        MediaEngineActions.setVideoQuality(res);
    } else if (typeof MediaEngineActions.setGoLiveQuality === "function") {
        MediaEngineActions.setGoLiveQuality(res);
    }
}

export default definePlugin({
    name: "Fix Screen Share Resolution",
    description: "Fixes the resolution of screen sharing in Discord.",
    authors: [{ name: "Anonymous", id: 0n }],

    start() {
        intervalId = setInterval(() => {
            // Проверяем, идет ли трансляция
            const currentStream = MediaEngineStore?.getGoLiveSource?.();
            if (!currentStream) {
                // Если стрим завершился, сбрасываем сохраненное состояние
                originalQuality = null;
                isFlipped = false;
                return;
            }

            if (!isFlipped) {
                // Сохраняем исходные параметры качества перед изменением
                const currentSettings = MediaEngineStore?.getSettings?.();
                if (currentSettings) {
                    originalQuality = {
                        width: currentSettings.videoQuality?.width || 1920,
                        height: currentSettings.videoQuality?.height || 1080,
                        frameRate: currentSettings.videoQuality?.frameRate || 60
                    };
                }

                const randomRes = getRandomResolution();
                applyResolution(randomRes);
                isFlipped = true;
            } else {
                // Возвращаем исходное разрешение
                if (originalQuality) {
                    applyResolution(originalQuality);
                }
                isFlipped = false;
            }
        }, 5000);
    },

    stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }

        // При отключении плагина возвращаем оригинальное разрешение, если оно было сохранено
        if (originalQuality) {
            applyResolution(originalQuality);
            originalQuality = null;
        }
        isFlipped = false;
    }
});
