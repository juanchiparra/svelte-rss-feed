import type { PageServerLoad } from "./$types";

// Prerender-safe: don't read searchParams on the server.
// We return an empty initial state; the universal +page.ts will run on the client
// after hydration and populate real data based on the query string.
export const load: PageServerLoad = async () => {
    return {
        items: [],
        byCategory: {},
        categories: [],
        errors: [],
        sources: [],
    };
};
