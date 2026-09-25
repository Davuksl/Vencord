import { definePlugin } from "@api/plugins";
import { webpack } from "@webpack";

// Find the Dispatcher and the module responsible for toggling video
const Dispatcher = webpack.getByProps("dispatch", "subscribe");
const MediaEngineActions = webpack.getByProps("setVideoEnabled");
const VoiceStore = webpack.getByProps("getChannelId", "getVoiceState");

export default definePlugin({
    name: "AutoCamera",
    description: "Instantly turns on your camera after joining any call or voice channel.",
    authors: [{ name: "Davuks", id: 0n }],

    start() {
        // Subscribe to Discord's internal state updates
        Dispatcher.subscribe("VOICE_STATE_UPDATE", this.handleVoiceStateUpdate);
    },

    stop() {
        // Clean up event listener when plugin stops
        Dispatcher.unsubscribe("VOICE_STATE_UPDATE", this.handleVoiceStateUpdate);
    },

    handleVoiceStateUpdate(e: any) {
        // Check if the state update belongs to the current user
        const currentUserId = webpack.getByProps("getCurrentUser")?.getCurrentUser()?.id;
        if (e.userId !== currentUserId) return;

        // Verify the user has entered a new voice channel (and didn't just leave one)
        const channelId = e.channelId;
        if (channelId) {
            // Delay slightly to ensure WebRTC connection is initialising
            setTimeout(() => {
                try {
                    // Turn video on (true: enabled, false: bypasses preview screen)
                    MediaEngineActions.setVideoEnabled(true, false);
                } catch (err) {
                    console.error("[AutoCamera] Failed to auto-start webcam:", err);
                }
            }, 500); 
        }
    }
});
