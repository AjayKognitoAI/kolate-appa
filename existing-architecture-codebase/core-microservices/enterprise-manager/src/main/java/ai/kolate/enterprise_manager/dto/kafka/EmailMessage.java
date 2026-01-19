package ai.kolate.enterprise_manager.dto.kafka;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.io.Serializable;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EmailMessage implements Serializable {
    private String source;
    private List<String> to;
    private List<String> cc;
    private List<String> bcc;
    private String templateName;
    private String templateData;
    @ToString.Exclude
    private String htmlContent;
    private String subject;
    private String from;
}
