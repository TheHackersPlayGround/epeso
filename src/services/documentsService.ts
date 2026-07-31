import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export function listFolders() {
  return axiosClient.get(ENDPOINTS.documents.listFolders).then(r => r.data)
}

export function createFolder(data: { name: string; parentId: string }) {
  return axiosClient.post(ENDPOINTS.documents.createFolder, data).then(r => r.data)
}

export function renameFolder(id: string, name: string) {
  return axiosClient.put(`${ENDPOINTS.documents.renameFolder}/${id}`, { name }).then(r => r.data)
}

export function deleteFolder(id: string) {
  return axiosClient.delete(`${ENDPOINTS.documents.deleteFolder}/${id}`).then(r => r.data)
}

export function listDocuments() {
  return axiosClient.get(ENDPOINTS.documents.listDocuments).then(r => r.data)
}

export function uploadDocument(data: { folderId: string; fileName: string; dataUrl: string }) {
  return axiosClient.post(ENDPOINTS.documents.uploadDocument, data).then(r => r.data)
}

export function renameDocument(id: string, name: string) {
  return axiosClient.put(`${ENDPOINTS.documents.renameDocument}/${id}`, { name }).then(r => r.data)
}

export function moveDocument(id: string, folderId: string) {
  return axiosClient.put(`${ENDPOINTS.documents.moveDocument}/${id}`, { folderId }).then(r => r.data)
}

export function deleteDocument(id: string) {
  return axiosClient.delete(`${ENDPOINTS.documents.deleteDocument}/${id}`).then(r => r.data)
}
