export function in2mins(): Date {
  let future = new Date();
  future.setMinutes(future.getMinutes() + 2);
  return future;
}
