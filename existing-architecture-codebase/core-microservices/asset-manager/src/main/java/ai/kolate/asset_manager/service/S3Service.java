package ai.kolate.asset_manager.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

public interface S3Service {
    String uploadFile(MultipartFile file, String folder);

    void deleteFolder(String folderPath);
}
