/**
 * Service to handle Google Drive file uploads
 */

async function getOrCreateFolder(token: string): Promise<string> {
  const folderName = 'DevLog Assets';
  
  // 1. Check if we already have the folder ID in session
  const cachedId = sessionStorage.getItem('google_drive_folder_id');
  if (cachedId) return cachedId;

  // 2. Search for the folder (only finds folders created by this app due to drive.file scope)
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (searchResponse.ok) {
    const data = await searchResponse.json();
    if (data.files && data.files.length > 0) {
      const id = data.files[0].id;
      sessionStorage.setItem('google_drive_folder_id', id);
      return id;
    }
  }

  // 3. Create the folder if not found
  const createResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );

  if (!createResponse.ok) {
    throw new Error('Failed to create DevLog Assets folder in Google Drive');
  }

  const folder = await createResponse.json();
  sessionStorage.setItem('google_drive_folder_id', folder.id);
  return folder.id;
}

async function handleDriveResponse(response: Response) {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('google_drive_token');
      sessionStorage.removeItem('google_drive_folder_id');
      throw new Error('Session expired. Please log in again.');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Drive API error: ${response.statusText}`);
  }
  return response.json();
}

export async function uploadToGoogleDrive(file: File, fileName: string, folderId?: string): Promise<string> {
  const token = localStorage.getItem('google_drive_token');
  if (!token) {
    throw new Error('No Google Drive access token found. Please log in again.');
  }

  // Use provided folderId or get/create the default "DevLog Assets" folder
  const parentId = folderId || await getOrCreateFolder(token);

  // 1. Metadata for the file with parent folder
  const metadata = {
    name: fileName,
    mimeType: file.type,
    parents: [parentId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  // 2. Upload to Google Drive
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,thumbnailLink,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  const result = await handleDriveResponse(response);
  
  // Using the thumbnail URL format which is very reliable for previews
  // sz=w1000 ensures we get a high-quality version
  return `https://drive.google.com/thumbnail?id=${result.id}&sz=w1000`;
}

export async function listFolders(): Promise<{ id: string, name: string }[]> {
  const token = localStorage.getItem('google_drive_token');
  if (!token) throw new Error('No Google Drive access token found');

  const q = "mimeType='application/vnd.google-apps.folder' and trashed=false";
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  const data = await handleDriveResponse(response);
  return data.files || [];
}

export async function createFolder(name: string): Promise<string> {
  const token = localStorage.getItem('google_drive_token');
  if (!token) throw new Error('No Google Drive access token found');

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );

  const data = await handleDriveResponse(response);
  return data.id;
}

export async function listFiles(folderId: string): Promise<{ id: string, name: string, thumbnailLink: string, webViewLink: string }[]> {
  const token = localStorage.getItem('google_drive_token');
  if (!token) throw new Error('No Google Drive access token found');

  const q = `'${folderId}' in parents and trashed=false`;
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,thumbnailLink,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  const data = await handleDriveResponse(response);
  return data.files || [];
}

export async function deleteFile(fileId: string): Promise<void> {
  const token = localStorage.getItem('google_drive_token');
  if (!token) throw new Error('No Google Drive access token found');

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (response.status !== 204) {
    await handleDriveResponse(response);
  }
}

export async function searchFiles(queryText: string, folderId?: string): Promise<{ id: string, name: string, thumbnailLink: string, webViewLink: string }[]> {
  const token = localStorage.getItem('google_drive_token');
  if (!token) throw new Error('No Google Drive access token found');

  let q = `name contains '${queryText}' and mimeType != 'application/vnd.google-apps.folder' and trashed=false`;
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,thumbnailLink,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  const data = await handleDriveResponse(response);
  return data.files || [];
}

export async function moveFile(fileId: string, newParentId: string, oldParentId: string): Promise<void> {
  const token = localStorage.getItem('google_drive_token');
  if (!token) throw new Error('No Google Drive access token found');

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParentId}&removeParents=${oldParentId}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  await handleDriveResponse(response);
}

export async function copyFile(fileId: string, newParentId: string): Promise<void> {
  const token = localStorage.getItem('google_drive_token');
  if (!token) throw new Error('No Google Drive access token found');

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/copy`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parents: [newParentId],
      }),
    }
  );

  await handleDriveResponse(response);
}

export async function fetchDriveFile(fileId: string): Promise<string> {
  const token = localStorage.getItem('google_drive_token');
  if (!token) {
    throw new Error('No Google Drive access token found');
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch file from Google Drive');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
