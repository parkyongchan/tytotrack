package server.domain.chat;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByRoomOrderByIdAsc(String room);
    List<ChatMessage> findByRoomAndIdGreaterThanOrderByIdAsc(String room, Long lastId);
}