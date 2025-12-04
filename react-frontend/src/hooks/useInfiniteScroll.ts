import { useEffect, useRef } from 'react'

type InfiniteScrollOptions = {
    hasMore: boolean
    isLoading?: boolean
    onLoadMore: () => void
    rootMargin?: string
}

/**
 * IntersectionObserver-based infinite scroll helper.
 */
export function useInfiniteScroll({
    hasMore,
    isLoading = false,
    onLoadMore,
    rootMargin = '200px',
}: InfiniteScrollOptions) {
    const observerRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const target = observerRef.current
        if (!target || !hasMore || isLoading) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    onLoadMore()
                }
            },
            { rootMargin }
        )

        observer.observe(target)
        return () => observer.disconnect()
    }, [hasMore, isLoading, onLoadMore, rootMargin])

    return observerRef
}
