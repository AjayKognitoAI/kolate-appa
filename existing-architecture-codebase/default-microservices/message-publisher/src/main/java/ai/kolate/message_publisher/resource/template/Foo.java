package ai.kolate.message_publisher.resource.template;

import lombok.Builder;
import lombok.Data;
import lombok.ToString;

@Data
@ToString
@Builder
public class Foo {
    private String name;
    private String contact;
}
