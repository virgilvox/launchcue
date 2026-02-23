import apiService from './api.service'

const COMMENT_ENDPOINT = '/.netlify/functions/comments'

export default {
  getComments(resourceType, resourceId) {
    return apiService.get(COMMENT_ENDPOINT, { resourceType, resourceId })
  },
  getRecentComments() {
    return apiService.get(COMMENT_ENDPOINT)
  },
  createComment(data) {
    return apiService.post(COMMENT_ENDPOINT, data)
  },
  updateComment(id, data) {
    return apiService.put(`${COMMENT_ENDPOINT}/${id}`, data)
  },
  deleteComment(id) {
    return apiService.delete(`${COMMENT_ENDPOINT}/${id}`)
  }
}
