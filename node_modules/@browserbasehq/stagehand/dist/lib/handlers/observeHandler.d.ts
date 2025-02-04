import { LogLine } from "../../types/log";
import { Stagehand } from "../index";
import { LLMClient } from "../llm/LLMClient";
import { StagehandPage } from "../StagehandPage";
export declare class StagehandObserveHandler {
    private readonly stagehand;
    private readonly logger;
    private readonly stagehandPage;
    private observations;
    private readonly userProvidedInstructions?;
    constructor({ stagehand, logger, stagehandPage, userProvidedInstructions, }: {
        stagehand: Stagehand;
        logger: (logLine: LogLine) => void;
        stagehandPage: StagehandPage;
        userProvidedInstructions?: string;
    });
    private _recordObservation;
    observe({ instruction, llmClient, requestId, useAccessibilityTree, }: {
        instruction: string;
        llmClient: LLMClient;
        requestId: string;
        domSettleTimeoutMs?: number;
        useAccessibilityTree?: boolean;
    }): Promise<{
        selector: string;
        backendNodeId: number;
        description: string;
    }[]>;
}
