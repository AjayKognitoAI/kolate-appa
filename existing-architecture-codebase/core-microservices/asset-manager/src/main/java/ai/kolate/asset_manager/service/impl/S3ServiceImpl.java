package ai.kolate.asset_manager.service.impl;

import ai.kolate.asset_manager.service.S3Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectsRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.S3Object;
import software.amazon.awssdk.services.s3.model.ObjectIdentifier;
import java.io.IOException;
import java.net.URL;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class S3ServiceImpl implements S3Service {

    @Value("${cloud.aws.s3.bucket}")
    private String bucketName;

    @Value("${cloud.aws.credentials.access-key}")
    private String accessKey;

    @Value("${cloud.aws.credentials.secret-key}")
    private String secretKey;

    @Value("${cloud.aws.region.static}")
    private String region;

    @Value("${cdn.base.url}")
    private String cdnBaseUrl;

    @Override
    public String uploadFile(MultipartFile file, String folder) {
        String shortId = UUID.randomUUID().toString().substring(0, 8);
        String originalName = file.getOriginalFilename();
        String uniqueName = shortId + "_" + originalName ;
        String key = folder + "/" + uniqueName;
        S3Client s3 = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
        try {
            s3.putObject(PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(key)
                            .contentType(file.getContentType())
                            .build(),
                    software.amazon.awssdk.core.sync.RequestBody.fromBytes(file.getBytes()));
            // Return CDN URL instead of S3 URL
            return cdnBaseUrl + key;
        } catch (IOException | S3Exception e) {
            throw new RuntimeException("Failed to upload file to S3", e);
        } finally {
            s3.close();
        }
    }

    @Override
    public void deleteFolder(String folderPath) {
        S3Client s3 = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
        try {
            ListObjectsV2Request listReq = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(folderPath + "/")
                    .build();
            ListObjectsV2Response listRes = s3.listObjectsV2(listReq);
            List<ObjectIdentifier> toDelete = listRes.contents().stream()
                    .map(S3Object::key)
                    .map(k -> ObjectIdentifier.builder().key(k).build())
                    .collect(Collectors.toList());
            if (!toDelete.isEmpty()) {
                DeleteObjectsRequest delReq = DeleteObjectsRequest.builder()
                        .bucket(bucketName)
                        .delete(b -> b.objects(toDelete))
                        .build();
                s3.deleteObjects(delReq);
            }
        } catch (S3Exception e) {
            throw new RuntimeException("Failed to delete folder from S3", e);
        } finally {
            s3.close();
        }
    }
}
