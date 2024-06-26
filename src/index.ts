import * as core from "@actions/core";
import * as github from "@actions/github";

import { promises as fs } from "fs";
import yaml from "js-yaml";
import { handleCreateComment } from "./handlers/handle-create-comment";
import { handlePRMerge } from "./handlers/handle-pr-merge";
import { handlePROpen } from "./handlers/handle-pr-open";
import { handleRequestReview } from "./handlers/handle-request-review";
import { Reviewers } from "./types";
import { debug } from "./utils";
import { handleReviewSubmitted } from "./handlers/handle-review-submitted";

const reviewersFilePath: string = core.getInput("reviewers_file");

async function notifySlack() {
  try {
    core.info("Starting notifySlack function");

    const reviewersYaml = await fs.readFile(reviewersFilePath, "utf8");
    const reviewers = yaml.load(reviewersYaml) as Reviewers;
    debug(reviewers);

    const event = github.context.payload;
    core.info(`Event loaded: ${JSON.stringify(event)}`);
    debug(event);
    const { action, pull_request, comment, review } = event;

    let message = "";

    // PR 오픈 시 메시지 생성
    if (action === "opened" && pull_request) {
      return await handlePROpen(event, reviewers);
    }

    // 리뷰어 추가 시 기존 메시지의 리뷰어 업데이트
    if (action === "review_requested" && pull_request) {
      return await handleRequestReview(event, reviewers);
    }

    // 코멘트 생성 시 스레드에 달기
    if (action === "created" && comment) {
      return await handleCreateComment(event, reviewers);
    }

    // 리뷰를 통해 코멘트 제출하는 경우데도 스레드에 메시지 달기
    if (action === "submitted" && review) {
      return await handleReviewSubmitted(event, reviewers);
    }

    if (action === "closed" && pull_request?.merged_at) {
      core.info("Event merged");
      return await handlePRMerge(event);
    }
  } catch (error: any) {
    core.error("Error in notifySlack function:");
    core.error(error.message);
    process.exit(1);
  }
}

notifySlack().catch((error) => {
  core.error("Error caught in notifySlack:");
  core.error(error.message);
  process.exit(1);
});
