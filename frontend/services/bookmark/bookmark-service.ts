import api from "@/utils/axios";
import { API_CONFIG } from "@/utils/api-config";

const ENDPOINTS = API_CONFIG.PROJECT_MANAGER;

const BookmarkService = {
  createBookmark: (data: any, userId: string) => {
    return api.post(ENDPOINTS.BOOKMARKS, data);
  },

  getBookmarks: (projectId: string, trialSlug: string, page: number, size: number) => {
    return api.get(`${ENDPOINTS.BOOKMARKS}?project_id=${projectId}&trial_slug=${trialSlug}&page=${page}&size=${size}`);
  },

  getBookmark: (userId: string, projectId: string, trialSlug: string, executionId: string) => {
    return api.get(`${ENDPOINTS.BOOKMARKS}/bookmarked?project_id=${projectId}&trial_slug=${trialSlug}&execution_id=${executionId}`);
  },

  deleteBookmark: (bookmarkId: string) => {
    return api.delete(`${ENDPOINTS.BOOKMARKS}/${bookmarkId}`);
  },
};

export default BookmarkService;
