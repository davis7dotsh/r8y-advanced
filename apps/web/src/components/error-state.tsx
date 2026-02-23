export const ErrorState = ({
  title,
  message,
}: {
  title: string
  message: string
}) => (
  <section className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
    <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">{title}</h2>
    <p className="mt-2 text-sm text-red-700 dark:text-red-300">{message}</p>
  </section>
)
