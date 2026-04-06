type Pops = {
  retryCount: number;
};

export async function waitBeforeRetry({ retryCount }: Pops) {
  await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
}