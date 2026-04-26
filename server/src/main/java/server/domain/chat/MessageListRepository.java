package server.domain.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageListRepository extends JpaRepository<MessageList, Long> {
    List<MessageList> findAllByOrderByMidAsc();
    List<MessageList> findByUserIdOrderByMidDesc(Long userId);
    List<MessageList> findByMEsnOrderByMidAsc(String mEsn);
    java.util.Optional<MessageList> findByMid(Long mid);
}