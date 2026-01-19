package ai.kolate.asset_manager.controller;

import ai.kolate.asset_manager.dto.GlobalResponse;
import ai.kolate.asset_manager.service.S3Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/asset-manager/")
public class UploadController {

    @Autowired
    private S3Service s3Service;

    @PostMapping("/v1/enterprise-upload")
    public ResponseEntity<GlobalResponse> uploadFile(@RequestParam("file") MultipartFile file,
                                             @RequestHeader("org-id") String orgId) {
        try {
            String folder = "images/upload/" + orgId;
            String url = s3Service.uploadFile(file, folder);
            GlobalResponse response = GlobalResponse.builder()
                    .state("SUCCESS")
                    .status("200")
                    .message("File uploaded successfully.")
                    .data(url)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            GlobalResponse errorResponse = GlobalResponse.builder()
                    .state("FAIL")
                    .status("500")
                    .message("File upload failed: " + e.getMessage())
                    .data(null)
                    .build();
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @DeleteMapping("/v1/enterprise-folder")
    public ResponseEntity<GlobalResponse> deleteEnterpriseFolder(@RequestHeader("org-id") String orgId) {
        try {
            String folderPath = "images/upload/" + orgId;
            s3Service.deleteFolder(folderPath);
            GlobalResponse response = GlobalResponse.builder()
                    .state("SUCCESS")
                    .status("200")
                    .message("Folder deleted successfully.")
                    .data(null)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            GlobalResponse errorResponse = GlobalResponse.builder()
                    .state("FAIL")
                    .status("500")
                    .message("Folder deletion failed: " + e.getMessage())
                    .data(null)
                    .build();
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}
