interface PillProps<T> {
  value: T;
}

export function Pill<T>({ value }: PillProps<T>) {
  return (
    <div className=" relative flex cursor-pointer items-center rounded-lg bg-gray-5 p-1 text-gray-40 transition-colors duration-200 ease-out">
      {value}
    </div>
  );
}
