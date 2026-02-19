export const ErrorState = ({
  title,
  message,
}: {
  title: string
  message: string
}) => (
  <section className="rounded-xl border border-red-200 bg-red-50 p-6">
    <h2 className="text-lg font-semibold text-red-900">{title}</h2>
    <p className="mt-2 text-sm text-red-700">{message}</p>
  </section>
)
