type Props = {
  retryCount: number;
};

export async function waitBeforeRetry({ retryCount }: Props) {
  await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
}
