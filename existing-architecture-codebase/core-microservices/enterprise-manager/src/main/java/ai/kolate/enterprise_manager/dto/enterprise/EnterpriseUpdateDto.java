package ai.kolate.enterprise_manager.dto.enterprise;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EnterpriseUpdateDto {
    private String name;
    private String description;
    private String logoUrl;
    private String size;
    private String region;
    private String contactNumber;
    private String zipCode;

}
