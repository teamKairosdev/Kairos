export default function RootLoading() {
  return (
    <div className="flex flex-col gap-8 w-full" aria-busy="true" aria-label="로딩 중">
      <div className="space-y-3">
        <div className="skeleton animate-pulse w-48 h-7 rounded" />
        <div className="skeleton animate-pulse w-72 h-4 rounded" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="skeleton animate-pulse h-28 rounded-2xl" />
        <div className="skeleton animate-pulse h-28 rounded-2xl" />
        <div className="skeleton animate-pulse h-28 rounded-2xl" />
        <div className="skeleton animate-pulse h-28 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-4">
          <div className="skeleton animate-pulse h-64 rounded-2xl" />
          <div className="skeleton animate-pulse h-40 rounded-2xl" />
        </div>
        <div className="skeleton animate-pulse h-56 rounded-2xl" />
      </div>
    </div>
  );
}
