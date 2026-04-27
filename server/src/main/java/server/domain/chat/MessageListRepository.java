package server.domain.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;;

public interface MessageListRepository extends JpaRepository<MessageList, Long> {
    List<MessageList> findAllByOrderByMidAsc();
    List<MessageList> findByUserIdOrderByMidDesc(Long userId);
    @Query("SELECT m FROM MessageList m WHERE m.mEsn = :mEsn ORDER BY m.mid ASC")
    List<MessageList> findByMEsnOrderByMidAsc(@Param("mEsn") String mEsn);
    java.util.Optional<MessageList> findByMid(Long mid);

    @Modifying
    @Transactional
    @Query("DELETE FROM MessageList m WHERE m.mEsn = :mEsn")
    int deleteByMEsn(@Param("mEsn") String mEsn);


}